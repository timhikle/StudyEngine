package com.studyengine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class TimerService : Service() {
  companion object {
    const val CHANNEL_ID = "timer_channel"
    const val NOTIFICATION_ID = 1001
    var isRunning = false
      private set
    var remainingSeconds = 0
      private set
    var activeTimerType = ""
      private set
  }

  private var handlerThread: HandlerThread? = null
  private var handler: Handler? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    handlerThread = HandlerThread("TimerThread").apply { start() }
    handler = Handler(handlerThread!!.looper)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      "START" -> {
        remainingSeconds = intent.getIntExtra("totalSeconds", 60)
        activeTimerType = intent.getStringExtra("timerType") ?: "phase_intervals"
        startForeground(NOTIFICATION_ID, buildNotification())
        isRunning = true
        acquireWakeLock()
        startTicking()
      }
      "STOP" -> {
        stopTicking()
        isRunning = false
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
      "PAUSE" -> {
        stopTicking()
        isRunning = false
        releaseWakeLock()
        updateNotification()
      }
      "RESUME" -> {
        isRunning = true
        acquireWakeLock()
        startTicking()
        updateNotification()
      }
      "SET_REMAINING" -> {
        remainingSeconds = intent.getIntExtra("remainingSeconds", remainingSeconds)
        val newType = intent.getStringExtra("timerType")
        if (newType != null) activeTimerType = newType
        updateNotification()
      }
    }
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopTicking()
    isRunning = false
    releaseWakeLock()
    handlerThread?.quitSafely()
    handlerThread = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  private fun startTicking() {
    handler?.post(object : Runnable {
      override fun run() {
        if (!isRunning) return
        if (remainingSeconds <= 0) {
          onTimerComplete()
          return
        }
        remainingSeconds--
        // Re-acquire wake lock with 3s timeout each tick to prevent deep sleep delays
        reacquireWakeLock()
        updateNotification()
        emitEvent("onTimerTick", remainingSeconds)
        handler?.postDelayed(this, 1000)
      }
    })
  }

  private fun stopTicking() {
    handler?.removeCallbacksAndMessages(null)
  }

  private fun onTimerComplete() {
    isRunning = false
    stopTicking()
    releaseWakeLock()
    // Vibrate to alert user that countdown finished
    vibrate()
    // If this was a waiting timer, show a "Starting now" notification
    if (activeTimerType == "waiting") {
      showStartingNotification()
    }
    emitEvent("onTimerComplete", 0)
    updateNotification()
  }

  private fun vibrate() {
    try {
      val vib = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
        vm.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        getSystemService(VIBRATOR_SERVICE) as Vibrator
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vib.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
      } else {
        @Suppress("DEPRECATION")
        vib.vibrate(500)
      }
    } catch (_: Exception) {}
  }

  private fun showStartingNotification() {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    val intent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this, 1, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notif = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Phase Study")
      .setContentText("Schedule started! Time to study.")
      .setSmallIcon(com.studyengine.R.mipmap.ic_launcher)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build()
    manager.notify(NOTIFICATION_ID + 1, notif)
  }

  private fun updateNotification() {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val min = remainingSeconds / 60
    val sec = remainingSeconds % 60
    val timeStr = String.format("%02d:%02d", min, sec)
    val label = when (activeTimerType) {
      "big_break" -> "Big Break"
      "waiting" -> "Starting in"
      else -> "Study Phase"
    }

    val intent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notif = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Phase Study - $label")
      .setContentText(if (activeTimerType == "waiting") "$timeStr until start" else "$timeStr remaining")
      .setSmallIcon(com.studyengine.R.mipmap.ic_launcher)
      .setOngoing(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      notif.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
    }

    return notif.build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID, "Timer Service",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Shows timer progress and alerts"
        setShowBadge(true)
        enableVibration(true)
      }
      val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  private fun acquireWakeLock() {
    if (wakeLock == null) {
      val power = getSystemService(POWER_SERVICE) as PowerManager
      wakeLock = power.newWakeLock(
        PowerManager.PARTIAL_WAKE_LOCK, "PhaseStudy:TimerLock"
      )
      wakeLock?.acquire(3000)
    }
  }

  private fun reacquireWakeLock() {
    wakeLock?.let {
      it.release()
    }
    val power = getSystemService(POWER_SERVICE) as PowerManager
    wakeLock = power.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK, "PhaseStudy:TimerLock"
    )
    wakeLock?.acquire(3000)
  }

  private fun releaseWakeLock() {
    wakeLock?.let {
      if (it.isHeld) it.release()
    }
    wakeLock = null
  }

  private fun getReactContext(): ReactContext? {
    return try {
      val app = applicationContext as ReactApplication
      app.reactHost?.currentReactContext
    } catch (_: Exception) { null }
  }

  private fun emitEvent(name: String, data: Any) {
    val reactContext = getReactContext() ?: return
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(name, data)
    } catch (_: Exception) {}
  }
}

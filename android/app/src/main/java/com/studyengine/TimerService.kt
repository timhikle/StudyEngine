package com.studyengine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
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

  private val handler = Handler(Looper.getMainLooper())
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
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
        stopSelf()
      }
      "PAUSE" -> {
        stopTicking()
        isRunning = false
        updateNotification()
      }
      "RESUME" -> {
        isRunning = true
        startTicking()
        updateNotification()
      }
      "SET_REMAINING" -> {
        remainingSeconds = intent.getIntExtra("remainingSeconds", remainingSeconds)
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
    stopRingtone()
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  private fun startTicking() {
    handler.post(object : Runnable {
      override fun run() {
        if (!isRunning) return
        if (remainingSeconds <= 0) {
          onTimerComplete()
          return
        }
        remainingSeconds--
        updateNotification()
        emitEvent("onTimerTick", remainingSeconds)
        handler.postDelayed(this, 1000)
      }
    })
  }

  private fun stopTicking() {
    handler.removeCallbacksAndMessages(null)
  }

  private fun onTimerComplete() {
    isRunning = false
    stopTicking()
    releaseWakeLock()
    emitEvent("onTimerComplete", 0)
    updateNotification()
  }

  private fun updateNotification() {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val min = remainingSeconds / 60
    val sec = remainingSeconds % 60
    val timeStr = String.format("%02d:%02d", min, sec)
    val label = if (activeTimerType == "big_break") "Big Break" else "Study Phase"

    val intent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Phase Study - $label")
      .setContentText("$timeStr remaining")
      .setSmallIcon(com.studyengine.R.mipmap.ic_launcher)
      .setOngoing(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID, "Timer Service",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Shows timer progress in background"
        setShowBadge(false)
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
      wakeLock?.acquire(10 * 60 * 1000L)
    }
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

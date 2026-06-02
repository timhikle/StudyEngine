package com.studyengine

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
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
    const val ALARM_REQUEST_CODE = 2001
    const val PREFS_NAME = "timer_state"
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
  private var prefs: SharedPreferences? = null
  private var alarmManager: AlarmManager? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    handlerThread = HandlerThread("TimerThread").apply { start() }
    handler = Handler(handlerThread!!.looper)
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    alarmManager = getSystemService(ALARM_SERVICE) as? AlarmManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      "START" -> {
        remainingSeconds = intent.getIntExtra("totalSeconds", 60)
        activeTimerType = intent.getStringExtra("timerType") ?: "phase_intervals"
        persistState()
        startForeground(NOTIFICATION_ID, buildNotification())
        isRunning = true
        acquireWakeLock()
        scheduleAlarmFallback()
        startTicking()
      }
      "STOP" -> {
        stopTicking()
        isRunning = false
        releaseWakeLock()
        cancelAlarmFallback()
        clearPersistedState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
      "PAUSE" -> {
        stopTicking()
        isRunning = false
        releaseWakeLock()
        cancelAlarmFallback()
        persistState()
        updateNotification()
      }
      "RESUME" -> {
        isRunning = true
        acquireWakeLock()
        scheduleAlarmFallback()
        startTicking()
        updateNotification()
      }
      "SET_REMAINING" -> {
        remainingSeconds = intent.getIntExtra("remainingSeconds", remainingSeconds)
        val newType = intent.getStringExtra("timerType")
        if (newType != null) activeTimerType = newType
        persistState()
        updateNotification()
      }
      "RESTORE" -> {
        if (!isRunning && prefs?.contains("remainingSeconds") == true) {
          remainingSeconds = prefs?.getInt("remainingSeconds", 60) ?: 60
          activeTimerType = prefs?.getString("timerType", "phase_intervals") ?: "phase_intervals"
          if (remainingSeconds > 0) {
            isRunning = true
            startForeground(NOTIFICATION_ID, buildNotification())
            acquireWakeLock()
            scheduleAlarmFallback()
            startTicking()
          }
        }
      }
    }
    return START_REDELIVER_INTENT
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

  override fun onTaskRemoved(rootIntent: Intent?) {
    // User swiped away app — keep service alive
    val restart = Intent(this, TimerService::class.java).apply { action = "RESTORE" }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(restart)
    } else {
      startService(restart)
    }
    super.onTaskRemoved(rootIntent)
  }

  private fun persistState() {
    prefs?.edit()?.apply {
      putInt("remainingSeconds", remainingSeconds)
      putString("timerType", activeTimerType)
      putBoolean("wasRunning", true)
      apply()
    }
  }

  private fun clearPersistedState() {
    prefs?.edit()?.clear()?.apply()
  }

  private fun scheduleAlarmFallback() {
    if (remainingSeconds <= 0) return
    val triggerMs = System.currentTimeMillis() + remainingSeconds * 1000L
    val intent = Intent(this, AlarmReceiver::class.java).apply {
      putExtra("type", "timer_complete")
      putExtra("timer_type", activeTimerType)
    }
    val pendingIntent = PendingIntent.getBroadcast(
      this, ALARM_REQUEST_CODE, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (alarmManager?.canScheduleExactAlarms() == true) {
          alarmManager?.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pendingIntent)
        } else {
          alarmManager?.set(AlarmManager.RTC_WAKEUP, triggerMs, pendingIntent)
        }
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        alarmManager?.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pendingIntent)
      } else {
        alarmManager?.set(AlarmManager.RTC_WAKEUP, triggerMs, pendingIntent)
      }
    } catch (_: Exception) {}
  }

  private fun cancelAlarmFallback() {
    val intent = Intent(this, AlarmReceiver::class.java).apply { putExtra("type", "timer_complete") }
    val pendingIntent = PendingIntent.getBroadcast(
      this, ALARM_REQUEST_CODE, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
    )
    pendingIntent?.let { alarmManager?.cancel(it) }
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
    cancelAlarmFallback()
    clearPersistedState()
    vibrate()
    if (activeTimerType == "waiting") {
      showNotification("Phase Study", "Schedule started! Time to study.", false)
    } else {
      val label = when (activeTimerType) {
        "big_break" -> "Break over!"
        else -> "Study phase complete!"
      }
      showNotification("Phase Study - Timer Done", label, true)
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
        vib.vibrate(VibrationEffect.createOneShot(1000, VibrationEffect.DEFAULT_AMPLITUDE))
      } else {
        @Suppress("DEPRECATION")
        vib.vibrate(1000)
      }
    } catch (_: Exception) {}
  }

  private fun showNotification(title: String, text: String, autoCancel: Boolean) {
    try {
      val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      val intent = packageManager.getLaunchIntentForPackage(packageName)
      val pendingIntent = PendingIntent.getActivity(
        this, 2, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val notif = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle(title)
        .setContentText(text)
        .setSmallIcon(com.studyengine.R.mipmap.ic_launcher)
        .setAutoCancel(autoCancel)
        .setContentIntent(pendingIntent)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .build()
      manager.notify(NOTIFICATION_ID + 2, notif)
    } catch (_: Exception) {}
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
        enableLights(true)
      }
      val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  private fun acquireWakeLock() {
    try {
      if (wakeLock == null || !wakeLock!!.isHeld) {
        val power = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PhaseStudy:TimerLock")
        wakeLock?.acquire()
      }
    } catch (_: Exception) {}
  }

  private fun releaseWakeLock() {
    try {
      wakeLock?.let {
        if (it.isHeld) it.release()
      }
    } catch (_: Exception) {}
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

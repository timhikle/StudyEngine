package com.studyengine

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class TimerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "TimerModule"

  private var hasListeners = false

  @ReactMethod
  fun addListener(eventName: String) {
    hasListeners = true
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    hasListeners = false
  }

  @ReactMethod
  fun startTimer(totalSeconds: Int, timerType: String, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val intent = Intent(ctx, TimerService::class.java).apply {
        action = "START"
        putExtra("totalSeconds", totalSeconds)
        putExtra("timerType", timerType)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("TIMER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun stopTimer(promise: Promise) {
    try {
      reactApplicationContext.startService(
        Intent(reactApplicationContext, TimerService::class.java).apply { action = "STOP" }
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("TIMER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun pauseTimer(promise: Promise) {
    try {
      reactApplicationContext.startService(
        Intent(reactApplicationContext, TimerService::class.java).apply { action = "PAUSE" }
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("TIMER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun resumeTimer(promise: Promise) {
    try {
      reactApplicationContext.startService(
        Intent(reactApplicationContext, TimerService::class.java).apply { action = "RESUME" }
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("TIMER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun setRemaining(seconds: Int, timerType: String, promise: Promise) {
    try {
      reactApplicationContext.startService(
        Intent(reactApplicationContext, TimerService::class.java).apply {
          action = "SET_REMAINING"
          putExtra("remainingSeconds", seconds)
          putExtra("timerType", timerType)
        }
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("TIMER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun isServiceRunning(promise: Promise) {
    promise.resolve(TimerService.isRunning)
  }

  @ReactMethod
  fun getServiceState(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("isRunning", TimerService.isRunning)
    map.putInt("remainingSeconds", TimerService.remainingSeconds)
    map.putString("timerType", TimerService.activeTimerType)
    promise.resolve(map)
  }

  @ReactMethod
  fun stopRingtone(promise: Promise) {
    try {
      reactApplicationContext.startService(
        Intent(reactApplicationContext, TimerService::class.java).apply { action = "STOP_RINGTONE" }
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_ERROR", e.message)
    }
  }

  @ReactMethod
  fun scheduleReminder(message: String, timestampMs: Double, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val alarmManager = ctx.getSystemService(android.content.Context.ALARM_SERVICE) as AlarmManager
      val id = (1000..9999).random()

      val intent = Intent(ctx, AlarmReceiver::class.java).apply {
        putExtra("message", message)
        putExtra("reminder_id", id)
      }
      val pendingIntent = PendingIntent.getBroadcast(
        ctx, id, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (alarmManager.canScheduleExactAlarms()) {
          alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestampMs.toLong(), pendingIntent)
        } else {
          alarmManager.set(AlarmManager.RTC_WAKEUP, timestampMs.toLong(), pendingIntent)
        }
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestampMs.toLong(), pendingIntent)
      } else {
        alarmManager.set(AlarmManager.RTC_WAKEUP, timestampMs.toLong(), pendingIntent)
      }

      promise.resolve(id)
    } catch (e: Exception) {
      promise.reject("ALARM_ERROR", e.message)
    }
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val pm = ctx.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        promise.resolve(pm.isIgnoringBatteryOptimizations(ctx.packageName))
      } else {
        promise.resolve(true)
      }
    } catch (e: Exception) {
      promise.reject("BATTERY_ERROR", e.message)
    }
  }

  @ReactMethod
  fun openBatterySettings(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:${ctx.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      ctx.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("BATTERY_ERROR", e.message)
    }
  }
}

package com.studyengine

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class TimerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "TimerModule"

  @ReactMethod
  fun startTimer(totalSeconds: Int, timerType: String, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val intent = Intent(ctx, TimerService::class.java).apply {
        action = "START"
        putExtra("totalSeconds", totalSeconds)
        putExtra("timerType", timerType)
      }
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
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
      val ctx = reactApplicationContext
      ctx.stopService(Intent(ctx, TimerService::class.java))
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("TIMER_ERROR", e.message)
    }
  }

  @ReactMethod
  fun updateRemaining(seconds: Int, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      ctx.startService(Intent(ctx, TimerService::class.java).apply {
        action = "UPDATE"
        putExtra("remainingSeconds", seconds)
      })
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
    val map = com.facebook.react.bridge.Arguments.createMap()
    map.putBoolean("isRunning", TimerService.isRunning)
    map.putInt("remainingSeconds", TimerService.remainingSeconds)
    map.putString("timerType", TimerService.activeTimerType)
    promise.resolve(map)
  }

  @ReactMethod
  fun playRingtone(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      ctx.startService(Intent(ctx, TimerService::class.java).apply { action = "PLAY_RINGTONE" })
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_ERROR", e.message)
    }
  }

  @ReactMethod
  fun stopRingtone(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      ctx.startService(Intent(ctx, TimerService::class.java).apply { action = "STOP_RINGTONE" })
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_ERROR", e.message)
    }
  }
}

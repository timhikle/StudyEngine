package com.studyengine

import android.content.Context
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class SoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private var ringtone: Ringtone? = null

  override fun getName(): String = "SoundModule"

  @ReactMethod
  fun playSystemSound(soundName: String, promise: Promise) {
    try {
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      val ctx = reactApplicationContext
      val r = RingtoneManager.getRingtone(ctx, uri)
      r.play()
      android.os.Handler(ctx.mainLooper).postDelayed({ r.stop() }, 3000)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("PLAY_ERROR", e.message)
    }
  }

  @ReactMethod
  fun playRingtone(loop: Boolean, promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ringtone?.stop()
      ringtone = RingtoneManager.getRingtone(ctx, uri)
      ringtone?.isLooping = loop
      ringtone?.play()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("PLAY_ERROR", e.message)
    }
  }

  @ReactMethod
  fun stopRingtone(promise: Promise) {
    try {
      ringtone?.stop()
      ringtone = null
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STOP_ERROR", e.message)
    }
  }
}

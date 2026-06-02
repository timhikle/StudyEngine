package com.studyengine

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val type = intent.getStringExtra("type") ?: "reminder"

    val channelId = "reminder_channel"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId, "Reminders",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Scheduled reminders and alerts"
        enableVibration(true)
        enableLights(true)
      }
      val manager = context.getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pendingIntent = PendingIntent.getActivity(
      context, type.hashCode(), launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val (title, message) = when (type) {
      "timer_complete" -> {
        val timerType = intent.getStringExtra("timer_type") ?: ""
        val label = when (timerType) {
          "big_break" -> "Break over! Time to study."
          "waiting" -> "Schedule started! Let's go!"
          else -> "Study phase complete!"
        }
        Pair("Phase Study - Timer Done", label)
      }
      else -> {
        val msg = intent.getStringExtra("message") ?: "Time for your reminder!"
        Pair("Phase Study - Reminder", msg)
      }
    }

    val id = intent.getIntExtra("reminder_id", type.hashCode())

    val notification = NotificationCompat.Builder(context, channelId)
      .setContentTitle(title)
      .setContentText(message)
      .setSmallIcon(com.studyengine.R.mipmap.ic_launcher)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .build()

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(id, notification)
  }
}

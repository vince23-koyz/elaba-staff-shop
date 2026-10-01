package com.elaba_staff

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class BookingFirebaseMessagingService : FirebaseMessagingService() {
  companion object {
    private const val CHANNEL_ID = "booking_notifications"
    private const val CHANNEL_NAME = "Booking notifications"
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data
    val hasChatPayload = data["isChat"] == "1" || data.containsKey("conversationId")
    if (hasChatPayload) return

    val title = remoteMessage.notification?.title
      ?: data["title"]
      ?: data["notification_title"]
      ?: "New update"

    val body = remoteMessage.notification?.body
      ?: data["message"]
      ?: data["body"]
      ?: data["notification_body"]
      ?: "You have a new notification"

    if (isAppInForeground()) {
      return
    }

    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      action = Intent.ACTION_MAIN
      addCategory(Intent.CATEGORY_LAUNCHER)
    }

    val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    val pendingIntent = PendingIntent.getActivity(
      this,
      System.currentTimeMillis().toInt(),
      intent,
      pendingIntentFlags
    )

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_notif_elaba)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setAutoCancel(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_EVENT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setGroup("booking_notifications")
      .setContentIntent(pendingIntent)
      .build()

    NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
  }

  private fun isAppInForeground(): Boolean {
    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
      ?: return false
    val runningProcesses = activityManager.runningAppProcesses ?: return false
    return runningProcesses.any {
      it.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
        it.processName == packageName
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        CHANNEL_NAME,
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Booking and general notifications"
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }
}

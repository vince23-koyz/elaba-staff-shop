package com.elaba_staff

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

class ChatFirebaseMessagingService : FirebaseMessagingService() {
  companion object {
    private const val CHANNEL_ID = "chat_messages"
    private const val CHANNEL_NAME = "Chat messages"
    private const val PREFS_NAME = "chat_notifications_prefs"
    private const val MAX_STORED_MESSAGES = 5

    @JvmStatic
    fun clearConversationHistory(context: Context, conversationId: String) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().remove(getPrefsKey(conversationId)).apply()
    }

    @JvmStatic
    fun getNotificationId(conversationId: String): Int {
      val hash = conversationId.hashCode()
      return if (hash == Int.MIN_VALUE) 0 else abs(hash)
    }

    @JvmStatic
    fun removeMessagesFromHistory(context: Context, conversationId: String, messageIds: List<String>): Int {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val stored = prefs.getString(getPrefsKey(conversationId), "[]") ?: "[]"
      val chatMessages = try { JSONArray(stored) } catch (e: Exception) { JSONArray() }

      if (chatMessages.length() == 0) return 0

      val remaining = JSONArray()
      for (i in 0 until chatMessages.length()) {
        val item = chatMessages.getJSONObject(i)
        val id = item.optString("id")
        if (!messageIds.contains(id)) {
          remaining.put(item)
        }
      }

      prefs.edit().putString(getPrefsKey(conversationId), remaining.toString()).apply()
      return remaining.length()
    }

    @JvmStatic
    fun markConversationRead(context: Context, conversationId: String) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putBoolean(getReadPrefsKey(conversationId), true).apply()
    }

    @JvmStatic
    fun isConversationMarkedRead(context: Context, conversationId: String): Boolean {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      return prefs.getBoolean(getReadPrefsKey(conversationId), false)
    }

    @JvmStatic
    fun clearConversationReadMarker(context: Context, conversationId: String) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().remove(getReadPrefsKey(conversationId)).apply()
    }

    private fun getPrefsKey(conversationId: String) = "chat_messages_$conversationId"
    private fun getReadPrefsKey(conversationId: String) = "chat_read_$conversationId"
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data
    if (data["isChat"] == "1" || data.containsKey("conversationId")) {
      if (!isAppInForeground()) {
        showChatNotification(data)
      }
    }
  }

  private fun showChatNotification(data: Map<String, String>) {
    val senderName = data["sender_name"].takeUnless { it.isNullOrBlank() } ?: data["sender_id"].orEmpty()
    val shopName = data["shop_name"].takeUnless { it.isNullOrBlank() } ?: senderName
    val conversationId = data["conversationId"].takeUnless { it.isNullOrBlank() } ?: data["tag"].orEmpty()
    if (conversationId.isBlank()) return

    if (isConversationMarkedRead(this, conversationId)) {
      clearConversationHistory(this, conversationId)
      clearConversationReadMarker(this, conversationId)
    }

    val messageId = data["message_id"].takeUnless { it.isNullOrBlank() } ?: System.currentTimeMillis().toString()
    val chatMessages = appendChatMessage(
      conversationId,
      messageId,
      senderName,
      data["message"].orEmpty(),
      System.currentTimeMillis()
    )

    val notificationId = getNotificationId(conversationId)
    val senderDisplayName = senderName.ifBlank { shopName.ifBlank { "eLaba" } }
    val latestMessage = data["message"].orEmpty()

    // For collapsed view: show message if 1, show count if multiple
    val contentText = if (chatMessages.length() == 1) {
      latestMessage.ifBlank { "New message" }
    } else {
      "${chatMessages.length()} New Message"
    }

    // For expanded view: build all messages
    val expandedText = StringBuilder()
    for (i in 0 until chatMessages.length()) {
      val msg = chatMessages.getJSONObject(i)
      val text = msg.optString("text", "")
      if (expandedText.isNotEmpty()) {
        expandedText.append("\n")
      }
      expandedText.append(text)
    }

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_notif_elaba)
      .setColor(android.graphics.Color.WHITE)
      .setContentTitle(senderDisplayName)
      .setContentText(contentText)
      .setStyle(NotificationCompat.BigTextStyle().bigText(expandedText.toString()))
      .setAutoCancel(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setGroup("chat_$conversationId")
      .setContentIntent(buildPendingIntent(conversationId, data))
      .build()

    NotificationManagerCompat.from(this).notify(notificationId, notification)
  }

  private fun buildPendingIntent(conversationId: String, data: Map<String, String>): PendingIntent {
    val uri = android.net.Uri.Builder()
      .scheme("elabastaff")
      .authority("chat")
      .appendQueryParameter("sender_name", data["sender_name"])
      .appendQueryParameter("sender_id", data["sender_id"])
      .appendQueryParameter("receiver_type", data["receiver_type"])
      .appendQueryParameter("receiver_id", data["receiver_id"])
      .appendQueryParameter("shop_id", data["shop_id"])
      .appendQueryParameter("conversationId", data["conversationId"])
      .build()

    val intent = Intent(Intent.ACTION_VIEW, uri, this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    val requestCode = getNotificationId(conversationId)
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    return PendingIntent.getActivity(this, requestCode, intent, flags)
  }

  private fun appendChatMessage(conversationId: String, messageId: String, sender: String, text: String, timestamp: Long): JSONArray {
    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val stored = prefs.getString(getPrefsKey(conversationId), "[]") ?: "[]"
    val jsonArray = JSONArray(stored)

    for (i in 0 until jsonArray.length()) {
      val existing = jsonArray.getJSONObject(i)
      if (existing.optString("id") == messageId) {
        return jsonArray
      }
    }

    val messageObject = JSONObject().apply {
      put("id", messageId)
      put("sender", sender)
      put("text", text)
      put("timestamp", timestamp)
    }

    jsonArray.put(messageObject)
    while (jsonArray.length() > MAX_STORED_MESSAGES) {
      jsonArray.remove(0)
    }

    prefs.edit().putString(getPrefsKey(conversationId), jsonArray.toString()).apply()
    return jsonArray
  }

  private fun getPrefsKey(conversationId: String) = "chat_messages_$conversationId"

  private fun isAppInForeground(): Boolean {
    val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val processInfos = activityManager.runningAppProcesses ?: return false
    return processInfos.any { it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND && it.processName == packageName }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Chat message notifications"
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }
}

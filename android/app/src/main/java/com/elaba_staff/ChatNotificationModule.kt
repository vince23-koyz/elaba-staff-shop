package com.elaba_staff

import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class ChatNotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ChatNotificationModule"

  @ReactMethod
  fun clearConversationNotification(conversationId: String) {
    val context = reactApplicationContext
    ChatFirebaseMessagingService.clearConversationHistory(context, conversationId)
    ChatFirebaseMessagingService.clearConversationReadMarker(context, conversationId)
    NotificationManagerCompat.from(context)
      .cancel(ChatFirebaseMessagingService.getNotificationId(conversationId))
  }

  @ReactMethod
  fun markConversationRead(conversationId: String) {
    val context = reactApplicationContext
    ChatFirebaseMessagingService.markConversationRead(context, conversationId)
  }

  @ReactMethod
  fun removeConversationMessages(conversationId: String, messageIds: ReadableArray) {
    val context = reactApplicationContext
    val ids = mutableListOf<String>()
    for (i in 0 until messageIds.size()) {
      try {
        val id = messageIds.getString(i)
        if (id != null) ids.add(id)
      } catch (e: Exception) {
        // ignore non-string entries
      }
    }

    val remaining = ChatFirebaseMessagingService.removeMessagesFromHistory(context, conversationId, ids)
    if (remaining == 0) {
      NotificationManagerCompat.from(context)
        .cancel(ChatFirebaseMessagingService.getNotificationId(conversationId))
    }
  }
}

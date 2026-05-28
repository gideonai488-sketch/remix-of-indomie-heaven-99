import { useEffect, useRef } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform() || registered.current) return;

    const setup = async () => {
      try {
        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          console.log("Push notification permission not granted");
          return;
        }

        // Register with FCM/APNs
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener("registration", async (token) => {
          console.log("Push token:", token.value);
          registered.current = true;

          const platform = Capacitor.getPlatform(); // 'ios' or 'android'

          // Upsert token to database
          const { error } = await supabase.from("push_tokens").upsert(
            {
              user_id: user.id,
              token: token.value,
              platform,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" }
          );

          if (error) console.error("Failed to save push token:", error);
        });

        // Handle registration errors
        PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration error:", error);
        });

        // Handle incoming notifications when app is open
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          toast(notification.title || "Notification", {
            description: notification.body,
          });
        });

        // Handle notification tap (app opened from notification)
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const data = action.notification.data;
          if (data?.type === "order_update" && data?.order_id) {
            // Navigate to orders tab in profile
            window.location.href = "/profile?tab=orders";
          }
        });
      } catch (err) {
        console.error("Push notification setup failed:", err);
      }
    };

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);
};

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || "TASKORA", {
    body: data.body || "",
    tag: data.tag || "taskora-notification",
    data: { route: data.route || "/app/notifications" },
    requireInteraction: data.priority === "urgent",
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route || "/app/notifications";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const target = new URL(route, self.location.origin).href;
    for (const client of list) if ("focus" in client) { client.navigate(target); return client.focus(); }
    return clients.openWindow(target);
  }));
});
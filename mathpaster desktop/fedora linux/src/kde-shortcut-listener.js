"use strict";

const dbus = require("dbus-next");

const KDE_SHORTCUT_SERVICE = "org.kde.kglobalaccel";
const KDE_SHORTCUT_COMPONENT = "/component/com_mathpaster_MathPaster";
const KDE_SHORTCUT_INTERFACE = "org.kde.kglobalaccel.Component";
const KDE_SHORTCUT_MEMBER = "globalShortcutPressed";
const KDE_MATCH_RULE = `type='signal',sender='${KDE_SHORTCUT_SERVICE}',interface='${KDE_SHORTCUT_INTERFACE}',path='${KDE_SHORTCUT_COMPONENT}',member='${KDE_SHORTCUT_MEMBER}'`;

function isMathPasterShortcutPress(component, action, accelerator = "Alt+M") {
  return component === "com.mathpaster.MathPaster"
    && typeof action === "string"
    && action.endsWith(`-${accelerator}`);
}

function createKdeShortcutListener(callback, options = {}) {
  const createSessionBus = options.sessionBus || dbus.sessionBus;
  const accelerator = options.accelerator || "Alt+M";
  let bus = null;
  let stopped = true;

  function handleMessage(message) {
    if (stopped
      || message.path !== KDE_SHORTCUT_COMPONENT
      || message.interface !== KDE_SHORTCUT_INTERFACE
      || message.member !== KDE_SHORTCUT_MEMBER) return;
    const [component, action] = message.body || [];
    if (isMathPasterShortcutPress(component, action, accelerator)) {
      console.info(`KDE shortcut press received: ${action}.`);
      callback();
    }
  }

  function handleError(error) {
    console.error("KDE shortcut D-Bus error:", error);
  }

  return {
    async start() {
      if (!stopped) return true;
      stopped = false;
      try {
        bus = createSessionBus();
        bus.on("message", handleMessage);
        bus.on("error", handleError);
        await bus.call(new dbus.Message({
          path: "/org/freedesktop/DBus",
          destination: "org.freedesktop.DBus",
          interface: "org.freedesktop.DBus",
          member: "AddMatch",
          signature: "s",
          body: [KDE_MATCH_RULE]
        }));
        if (stopped) {
          bus.disconnect();
          bus = null;
          return false;
        }
        return true;
      } catch (error) {
        this.stop();
        throw error;
      }
    },
    stop() {
      stopped = true;
      bus?.off("message", handleMessage);
      bus?.off("error", handleError);
      bus?.disconnect();
      bus = null;
    }
  };
}

module.exports = {
  createKdeShortcutListener,
  isMathPasterShortcutPress,
  KDE_MATCH_RULE
};

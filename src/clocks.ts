import {
  ExtensionContext,
  workspace,
  window,
  StatusBarAlignment,
  MarkdownString,
  StatusBarItem,
  WorkspaceConfiguration,
  l10n,
  ThemeColor,
} from "vscode";

const getTimeLocaleString = ({
  config,
  time,
  timeZone,
  isText,
}: {
  config: WorkspaceConfiguration;
  time: Date;
  timeZone?: string;
  isText?: boolean;
}) => {
  return time.toLocaleString(config.language, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: config.hour12,
    weekday: config.weekday || undefined,
    year: isText ? undefined : "numeric",
    month: isText ? undefined : "2-digit",
    day: isText ? undefined : "2-digit",
    second: config.showSecond && isText ? "2-digit" : undefined,
  });
};

const update = (item: StatusBarItem) => {
  const config = workspace.getConfiguration("clocks");
  const now = new Date();
  const nowHourMinute = now.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localTimeTip =
    getTimeLocaleString({ config, time: now }) + ` (${l10n.t("Local time")})`;
  const worldClocksTips = config.worldClocks?.map(
    (x: string) =>
      getTimeLocaleString({ config, time: now, timeZone: x }) + ` (${x})`
  );
  const alarmsTips = Object.entries(config.alarms).map(([k, v]) => {
    if (/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(k)) {
      return nowHourMinute === k ? `**${k} (${v})**` : `${k} (${v})`;
    }
    return `~~${k} (${v})~~`;
  });

  item.text = getTimeLocaleString({ config, time: now, isText: true });
  item.tooltip = new MarkdownString(
    localTimeTip +
      "\n\n---\n\n" +
      worldClocksTips.join("  \n") +
      "\n\n---\n\n" +
      alarmsTips.join("  \n")
  );
  item.backgroundColor = Object.keys(config.alarms)?.includes(nowHourMinute)
    ? new ThemeColor("statusBarItem.warningBackground")
    : undefined;
};
const startClock = (item: StatusBarItem, context: ExtensionContext) => {
  let disposed = false;
  const tick = () => {
    if (disposed) {
      return;
    }
    const config = workspace.getConfiguration("clocks");
    const now = Date.now();
    update(item);
    let next;
    if (config.showSecond) {
      next = 1000 - (now % 1000);
    } else {
      next = 60000 - (now % 60000);
    }
    setTimeout(tick, next);
  };
  tick();
  context.subscriptions.push({
    dispose() {
      disposed = true;
    },
  });
};
export function createStatusBarClocks(context: ExtensionContext) {
  const statusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right,
    -Infinity
  );

  statusBarItem.command = {
    command: "workbench.action.openSettings",
    title: "openSettings",
    arguments: ["@ext:larry-lan.clocks"],
  };
  statusBarItem.show();
  startClock(statusBarItem, context);

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("clocks")) {
        update(statusBarItem);
      }
    })
  );
  context.subscriptions.push(statusBarItem);

  return statusBarItem;
}

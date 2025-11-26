import { Solar } from "lunar-typescript";

export const solarToLunar = (time: Date) =>
  Solar.fromYmd(
    time.getFullYear(),
    time.getMonth() + 1,
    time.getDate()
  ).getLunar();

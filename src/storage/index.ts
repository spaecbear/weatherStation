import AsyncStorage from "@react-native-async-storage/async-storage";
import { Saves } from "./saves";

export const saves = new Saves(AsyncStorage);
export { Saves, defaultSettings, type Settings } from "./saves";
export type { KeyValueStore } from "./kv";

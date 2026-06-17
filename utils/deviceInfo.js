// utils/deviceInfo.js

function includesAny(value, items) {
  return items.some((item) => value.includes(item));
}

export function parseDeviceInfo(userAgent = "") {
  const ua = String(userAgent || "").toLowerCase();

  let browser = "Unknown";
  let os = "Unknown";
  let deviceName = "Device";

  // Browser
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browser = "Chrome";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Safari";
  } else if (ua.includes("firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    browser = "Opera";
  }

  // OS
  if (includesAny(ua, ["iphone", "ipad", "ios"])) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (includesAny(ua, ["mac os x", "macintosh"])) {
    os = "Mac";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // Device type / label
  if (ua.includes("iphone")) {
    deviceName = "iPhone";
  } else if (ua.includes("ipad")) {
    deviceName = "iPad";
  } else if (ua.includes("android") && ua.includes("mobile")) {
    deviceName = "Android Phone";
  } else if (ua.includes("android")) {
    deviceName = "Android Device";
  } else if (includesAny(ua, ["macintosh", "windows", "linux"])) {
    deviceName = "Desktop";
  }

  return {
    browser,
    os,
    deviceName: `${browser} on ${os}`,
    rawDeviceName: deviceName,
    userAgent: String(userAgent || ""),
  };
}

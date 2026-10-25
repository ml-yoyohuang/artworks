// Short vibrations where the browser supports them (Android Chrome); silently skipped elsewhere (iPhone Safari).

export function buzz(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function formatKoreanDate(date = new Date()) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]} >`;
}

export function formatKoreanTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

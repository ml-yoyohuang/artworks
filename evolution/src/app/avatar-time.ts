/** Cosmetic wall-clock choices; never consumes simulation randomness. Monday starts the cycle. */
export function avatarStyleAt(timeMs:number) {
  const date=new Date(timeMs),day=(date.getDay()+6)%7;
  return {
    glassesShape:['round','rounded','angular'][day%3],
    accessoryType:['flask','coffee','notebook'][((Math.floor(timeMs/60000)%3)+3)%3],
  };
}

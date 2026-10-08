# 古典虛構人物肖像

來源：使用內建 imagegen 工具原創生成。人物為虛構的十七世紀歐洲少女，垂首看向一旁，不與觀者對視。採古典明暗法、亞麻帽、深色羊毛衣與細膩的皮膚、髮絲、油彩和畫布紋理；未複製特定名畫或指定歷史人物。

最終素材：`fictional-portrait.webp`，1024×1280。此檔是便於下載及未來替換的來源副本；「有限的灰階」與「失序的肖像」各自內嵌同一張 WebP，因此不需載入旁邊的圖片檔、無網路請求，可單獨離線開啟。

## 最終生成提示詞

Use case: stylized-concept. Asset type: original fictional European old-master portrait source for two WebGL artworks, Bayer/halftone print and GPU pixel sorting. Create a completely fictional young adult European woman from circa 1660, in a contemplative three-quarter portrait. She is looking downward and off to the side, entirely away from the viewer, no direct eye contact. An intimate, extraordinary monochrome old-master oil portrait, inspired by the quiet chiaroscuro and human observation of seventeenth-century Dutch and European painting, without copying a specific existing painting or identifiable historical person. Natural luminous skin with exquisite fine pores, tiny irregular freckles and subtle creases; richly resolved hair, worn linen threads, faint oil brushwork, old linen canvas grain. Modest period linen cap with a few loose wavy strands and a simple dark wool dress with a small cream linen collar. No pearl earrings, no jewelry, no elaborate costume, no modern fashion, no makeup. Quiet expression with emotional interiority, delicate nose and cheek catching soft window light from the side, detailed dark shadows, full deep grayscale tonal range. Plain near-black warm-neutral background without objects. Vertical 4:5 framing, complete head and upper shoulders, generous small margins around the cap, face centered slightly high. The skin texture should be tender and remarkably detailed, not polished or plastic. Restrained fine-art museum quality, gently aged surface, not cracked beyond recognition. Black-and-white grayscale only, no sepia hue. No text, no watermark, no logos.

## 處理

保留生成的原始 PNG，僅為網頁交付等比例轉為 1024×1280 的 WebP（quality 90）。Bayer / 網點在 GPU 上量化亮度；排序頁先映射成深藍、朱紅與紙金，再做奇偶轉置交換。兩者皆使用真實的圖像紋理，而非以背景圖替代 shader 運算。

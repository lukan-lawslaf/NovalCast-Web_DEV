"use client"

// AsciiArt — "1s1s", made with the 21st ASCII editor and baked
// to its exact rendered output (looping video + poster). Zero dependencies:
// one <video> that fills its parent. Drop it behind or inside your content:
// <div className="relative h-96"><AsciiArt className="absolute inset-0" /></div>
// Remix the source recipe (styles, animation, palette) in the editor:
// https://21st.dev/community/ascii/editor?from=ce28fb3d-6bbe-4c90-83b7-6b2db90c7b43
export function AsciiArt({ className }: { className?: string }) {
  return (
    <video
      className={className}
      src={"https://assets.21st.dev/ascii-recipes/videos/user_3HdhXqtaGNK6PDvN2DFY8vAT2Sr/aaa3f286-9a3c-491d-ba90-4e016ab73ef1.mp4"}
      poster={"https://assets.21st.dev/ascii-recipes/thumbnails/user_3HdhXqtaGNK6PDvN2DFY8vAT2Sr/5a8e1637-89e6-4132-8e00-61fbb69fda53.webp"}
      autoPlay
      loop
      muted
      playsInline
      aria-label={"1s1s — animated ASCII art"}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  )
}

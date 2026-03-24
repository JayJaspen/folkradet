"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Banner {
  id: string;
  adsense_slot: string | null;
  image_url: string | null;
  link_url: string | null;
  name: string;
}

export type BannerPosition = "left" | "right" | "left-2" | "right-2";

interface Props {
  position: BannerPosition;
}

export default function BannerAd({ position }: Props) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const client = createClient();
    client
      .from("banners")
      .select("*")
      .eq("position", position)
      .eq("is_active", true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setBanner(data);
      });
  }, [position]);

  if (!banner) {
    return (
      <div className="banner-slot w-full">
        <span className="text-center px-2">Annonsplats</span>
      </div>
    );
  }

  // Google AdSense banner
  if (banner.adsense_slot) {
    return (
      <div className="w-full min-h-[250px]">
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 250 }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
          data-ad-slot={banner.adsense_slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Image banner
  if (banner.image_url) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={banner.image_url} alt={banner.name} className="w-full rounded-xl object-cover" />
    );
    return banner.link_url ? (
      <a href={banner.link_url} target="_blank" rel="noopener noreferrer">{img}</a>
    ) : img;
  }

  return (
    <div className="banner-slot w-full">
      <span>Annonsplats</span>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useMantineColorScheme } from "@mantine/core";

type Props = {
  height?: number;
};

export function BrandLogo({ height = 28 }: Props) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <div
      className={`hts-brandPlate ${
        colorScheme === "dark" ? "dark-logo" : ""
      }`}
    >
      <Image
        src="/assets/kj-globexus-wide.png"
        alt="KJ Globexus"
        width={240}
        height={48}
        priority
        className="hts-brandLogo"
        style={{ height, width: "auto" }}
      />
    </div>
  );
}

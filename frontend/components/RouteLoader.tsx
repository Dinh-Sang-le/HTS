"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import HTSLoader from "@/components/HTSLoader";

export default function RouteLoader() {
  const router = useRouter();

  // 1) đợi 1 chút mới show (route nhanh khỏi nháy)
  const LOADER_SHOW_DELAY_MS = 80;

  // 2) nếu đã show thì giữ tối thiểu
  const LOADER_MIN_VISIBLE_MS = 280; //280

  // 3) (TUỲ CHỌN) ép tổng thời gian loader giống nhau cho mọi route
  // set 0 để tắt. Ví dụ 450ms cho cảm giác “đều”
  const ROUTE_TOTAL_MS = 450;

  const [loading, setLoading] = useState(false);

  const labelRef = useRef("Loading…");

  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  // mốc thời gian
  const navStartedAt = useRef(0);     // lúc routeChangeStart
  const visibleSince = useRef(0);     // lúc loader thật sự hiện
  const isShown = useRef(false);      // loader đã show hay chưa

  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) window.clearTimeout(showTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      showTimer.current = null;
      hideTimer.current = null;
    };

    const start = () => {
      labelRef.current = "Loading…";
      navStartedAt.current = Date.now();
      visibleSince.current = 0;
      isShown.current = false;

      clearTimers();

      // show sau delay
      showTimer.current = window.setTimeout(() => {
        isShown.current = true;
        visibleSince.current = Date.now();
        setLoading(true);
      }, LOADER_SHOW_DELAY_MS);
    };

    const finishNow = () => {
      clearTimers();
      isShown.current = false;
      setLoading(false);
    };

    const done = () => {
      // nếu route xong trước khi loader show -> cancel show và không hiện
      if (!isShown.current) {
        if (showTimer.current) {
          window.clearTimeout(showTimer.current);
          showTimer.current = null;
        }
        return;
      }

      // nếu loader đã hiện -> tính thời gian cần giữ
      const now = Date.now();

      const visibleElapsed = visibleSince.current
        ? now - visibleSince.current
        : 0;

      const minVisibleRemain = Math.max(
        0,
        LOADER_MIN_VISIBLE_MS - visibleElapsed
      );

      // nếu muốn “mỗi trang đều thời gian như nhau”
      const totalElapsed = now - navStartedAt.current;
      const totalRemain =
        ROUTE_TOTAL_MS > 0 ? Math.max(0, ROUTE_TOTAL_MS - totalElapsed) : 0;

      const remain = Math.max(minVisibleRemain, totalRemain);

      hideTimer.current = window.setTimeout(finishNow, remain);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
      clearTimers();
    };
  }, [router.events]);

  if (!loading) return null;

  return <HTSLoader label={labelRef.current} spinner="lotus" />;
}

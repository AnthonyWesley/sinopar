import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetails } from "./order-details";

export const metadata: Metadata = { title: "Pedido recebido", robots: { index: false } };

export default function OrderPlacedPage(props: PageProps<"/pedido-confirmado">) {
  return (
    <div className="container-site max-w-3xl">
      <Suspense fallback={<div className="mt-6 h-96 rounded-2xl bg-surface-2" />}>
        <OrderDetails searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

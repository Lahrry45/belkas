import { Suspense } from "react";
import { PaymentReturn } from "./PaymentReturn";

export default function Page() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  );
}

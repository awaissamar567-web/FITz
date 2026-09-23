"use client";

import { useEffect, useState } from "react";
import { loadWhop, type WhopConstructor } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements } from "@whop/elements-react";

interface WhopElementsCheckoutProps {
  checkoutConfiguration: string;
  onError: () => void;
}

export default function WhopElementsCheckout({
  checkoutConfiguration,
  onError,
}: WhopElementsCheckoutProps) {
  const [elements, setElements] = useState<WhopConstructor | Promise<WhopConstructor | null> | null>(null);

  useEffect(() => {
    setElements(loadWhop());
  }, []);

  return (
    <WhopElements
      elements={elements}
      appearance={{ theme: { appearance: "dark", accentColor: "blue", grayColor: "slate" } }}
      onLoadError={onError}
    >
      <Checkout checkoutConfiguration={checkoutConfiguration}>
        <CheckoutElement onError={onError} />
      </Checkout>
    </WhopElements>
  );
}

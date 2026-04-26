// Shim for @testing-library/react's internal import of react-dom/test-utils.
// React 19 removed `act` from react-dom/test-utils — it now lives in `react`.
export { act } from "react";

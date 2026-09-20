import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PageHome from "./Home";

jest.mock("./components/BrandProducts", () => ({
  __esModule: true,
  default: ({ limit, initialProductForms }: { limit: number; initialProductForms: string[] }) => (
    <div data-testid="home-product-row" data-limit={limit} data-form={initialProductForms.join(",")} />
  ),
}));
jest.mock("./components/Growers", () => ({ __esModule: true, default: () => <div /> }));

test("homepage shows four Wiet and four Hasj products with matching overview links", () => {
  render(<MemoryRouter><PageHome productList={{ loading: false, list: [], page: 1 }} /></MemoryRouter>);

  const wiet = screen.getByRole("region", { name: "Wietproducten" });
  const hasj = screen.getByRole("region", { name: "Hasjproducten" });
  expect(within(wiet).getByTestId("home-product-row")).toHaveAttribute("data-limit", "4");
  expect(within(wiet).getByTestId("home-product-row")).toHaveAttribute("data-form", "Wiet");
  expect(within(wiet).getByRole("link", { name: "Bekijk alle wietproducten" })).toHaveAttribute("href", "/cannabis/wiet");
  expect(within(hasj).getByTestId("home-product-row")).toHaveAttribute("data-limit", "4");
  expect(within(hasj).getByTestId("home-product-row")).toHaveAttribute("data-form", "Hasj");
  expect(within(hasj).getByRole("link", { name: "Bekijk alle hasjproducten" })).toHaveAttribute("href", "/cannabis/hasj");
});

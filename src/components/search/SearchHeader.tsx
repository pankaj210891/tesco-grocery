interface SearchHeaderProps {
  query: string;
  resultCount: number;
}

export default function SearchHeader({ query, resultCount }: SearchHeaderProps) {
  if (!query) {
    return (
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Search Products</h1>
        <p className="text-gray-500 text-sm mt-1">
          Use the search bar above to find products.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black text-gray-900">
        Results for{" "}
        <span className="text-[#00539F]">&ldquo;{query}&rdquo;</span>
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {resultCount === 0
          ? "No products found"
          : `${resultCount} ${resultCount === 1 ? "product" : "products"} found`}
      </p>
    </div>
  );
}

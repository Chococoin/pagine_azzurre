// Legacy URL alias — many internal links (Header dropdown, cart, payment,
// shipping, placeorder, product detail) still point to /productlist/seller.
// This file simply re-renders the same page so those links keep working.
// The route protection (auth + isSeller/isAdmin) is handled by middleware
// and by the page component itself.
import ProductListPage from '../page';

export default ProductListPage;

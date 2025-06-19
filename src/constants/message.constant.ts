export const MESSAGE_ERROR = {
  USER_NOT_FOUND: 'User not found',
  INVALID_EMAIL: 'Invalid email',
  INVALID_PASSWORD: 'Invalid password',
  LOGIN_FAIL: 'Email or password is incorrect',
  UNAUTHORIZED: 'Unauthorized',
  USER_ALREADY_EXISTS: 'User already exists',
  SOME_THING_WENT_WRONG: 'Something went wrong, please try again later',
  PRODUCT_NOT_FOUND: 'Product not found',
  CART_ITEM_NOT_FOUND: 'Cart item not found',
  PERMISSION_DENIED: "You don't have permission to perform this action",
  INVALID_TOKEN: 'Invalid or expired token',
};

export const MESSAGE_SUCCESS = {
  GET_USER_SUCCESS: 'Get user success',
  LOGIN_SUCCESS: 'Login success',
  LOGOUT_SUCCESS: 'Logout success',
  REGISTER_SUCCESS: 'Register success',
  REFRESH_TOKEN_SUCCESS: 'Refresh token success',
  GET_DATA_SUCCESS: 'Get data successfully',
  UPDATE_DATA_SUCCESS: 'Update data successfully',
  ADD_TO_CART_SUCCESS: 'Item added to cart successfully',
  UPDATE_CART_SUCCESS: 'Cart updated successfully',
  REMOVE_FROM_CART_SUCCESS: 'Item removed from cart successfully',
};

export const STATUS_MESSAGE: { [key: number]: string } = {
  // Thành công
  200: 'success',
  201: 'created',

  // Chuyển hướng
  301: 'moved permanently',
  302: 'found',

  // Lỗi Client
  400: 'bad request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not found',
  405: 'method not allowed',
  408: 'request timeout',
  429: 'too many requests',

  // Lỗi Server
  500: 'internal server error',
  501: 'not implemented',
  503: 'service unavailable',
  504: 'gateway timeout',
};

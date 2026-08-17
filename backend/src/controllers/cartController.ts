import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { cartService, wishlistService } from "../services/cartService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const cartController = {
  getCart: asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.getCart(req.user!.id);
    res.status(HttpStatus.OK).json(successResponse("Cart fetched successfully", cart));
  }),

  addItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await cartService.addItem(req.user!.id, req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Item added to cart", item));
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await cartService.updateItem(req.user!.id, req.params.id, req.body.quantity);
    res.status(HttpStatus.OK).json(successResponse("Cart item updated", item));
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    await cartService.removeItem(req.user!.id, req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Item removed from cart", null));
  }),

  clearCart: asyncHandler(async (req: Request, res: Response) => {
    await cartService.clearCart(req.user!.id);
    res.status(HttpStatus.OK).json(successResponse("Cart cleared", null));
  }),
};

export const wishlistController = {
  getWishlist: asyncHandler(async (req: Request, res: Response) => {
    const items = await wishlistService.getWishlist(req.user!.id);
    res.status(HttpStatus.OK).json(successResponse("Wishlist fetched successfully", items));
  }),

  addItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await wishlistService.addItem(req.user!.id, req.body.productId);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Added to wishlist", item));
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    await wishlistService.removeItem(req.user!.id, req.params.productId);
    res.status(HttpStatus.OK).json(successResponse("Removed from wishlist", null));
  }),
};

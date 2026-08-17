import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { productService } from "../services/productService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const productController = {
  // ── Public ─────────────────────────────────────────────────────────────

  listPublic: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.listPublic(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Products fetched successfully", result));
  }),

  getPublic: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getPublic(req.params.id);
    const related = await productService.getRelated(product.id, product.categoryId);
    res
      .status(HttpStatus.OK)
      .json(successResponse("Product fetched successfully", { ...product, related }));
  }),

  // ── Admin ──────────────────────────────────────────────────────────────

  adminList: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.adminList(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Products fetched successfully", result));
  }),

  adminGet: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.adminGet(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Product fetched successfully", product));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Product created successfully", product));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.update(req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Product updated successfully", product));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await productService.remove(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Product deleted successfully", null));
  }),
};

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { reviewService } from "../services/reviewService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const reviewController = {
  listForProduct: asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.listForProduct(req.params.productId, req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Reviews fetched successfully", result));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.create(req.user!.id, req.params.productId, req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Review submitted successfully", review));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.update(req.user!.id, req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Review updated successfully", review));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await reviewService.remove(req.user!.id, req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Review deleted successfully", null));
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.listForUser(req.user!.id, req.query as never);
    res.status(HttpStatus.OK).json(successResponse("My reviews fetched successfully", result));
  }),

  adminList: asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.adminList(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Reviews fetched successfully", result));
  }),

  adminRemove: asyncHandler(async (req: Request, res: Response) => {
    await reviewService.adminRemove(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Review deleted successfully", null));
  }),
};

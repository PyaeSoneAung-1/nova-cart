import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { orderService } from "../services/orderService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const orderController = {
  // ── Customer ───────────────────────────────────────────────────────────

  create: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.create(req.user!.id, req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Order placed successfully", order));
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const result = await orderService.listForUser(req.user!.id, req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Orders fetched successfully", result));
  }),

  getMine: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getForUser(req.user!.id, req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Order fetched successfully", order));
  }),

  cancelMine: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.cancel(req.user!.id, req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Order cancelled successfully", order));
  }),

  // ── Admin ──────────────────────────────────────────────────────────────

  adminList: asyncHandler(async (req: Request, res: Response) => {
    const result = await orderService.adminList(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Orders fetched successfully", result));
  }),

  adminGet: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.adminGet(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Order fetched successfully", order));
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    res.status(HttpStatus.OK).json(successResponse("Order status updated successfully", order));
  }),
};

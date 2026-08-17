import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { inventoryService } from "../services/inventoryService";
import { statsService } from "../services/statsService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const inventoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await inventoryService.list(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Inventory fetched successfully", result));
  }),

  adjust: asyncHandler(async (req: Request, res: Response) => {
    const result = await inventoryService.adjust(req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Inventory adjusted successfully", result));
  }),

  logs: asyncHandler(async (req: Request, res: Response) => {
    const logs = await inventoryService.recentLogs(Number(req.query.limit) || 50);
    res.status(HttpStatus.OK).json(successResponse("Inventory logs fetched successfully", logs));
  }),
};

export const statsController = {
  overview: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await statsService.overview();
    res.status(HttpStatus.OK).json(successResponse("Dashboard stats fetched successfully", stats));
  }),

  revenueOverTime: asyncHandler(async (req: Request, res: Response) => {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const data = await statsService.revenueOverTime(days);
    res.status(HttpStatus.OK).json(successResponse("Revenue data fetched successfully", data));
  }),

  topProducts: asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const data = await statsService.topProducts(limit);
    res.status(HttpStatus.OK).json(successResponse("Top products fetched successfully", data));
  }),

  salesByCategory: asyncHandler(async (_req: Request, res: Response) => {
    const data = await statsService.salesByCategory();
    res.status(HttpStatus.OK).json(successResponse("Category sales fetched successfully", data));
  }),
};

import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { couponService } from "../services/couponService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const couponController = {
  validate: asyncHandler(async (req: Request, res: Response) => {
    const result = await couponService.validate(req.body.code, req.body.subtotal ?? 0);
    res.status(HttpStatus.OK).json(successResponse("Coupon is valid", result));
  }),

  listAdmin: asyncHandler(async (req: Request, res: Response) => {
    const result = await couponService.listAdmin(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Coupons fetched successfully", result));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.create(req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Coupon created successfully", coupon));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.update(req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Coupon updated successfully", coupon));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await couponService.remove(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Coupon deleted successfully", null));
  }),
};

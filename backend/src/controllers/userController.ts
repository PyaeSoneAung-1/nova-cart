import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { userService } from "../services/userService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const userController = {
  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Profile updated successfully", user));
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await userService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    res
      .status(HttpStatus.OK)
      .json(successResponse("Password changed successfully. Please log in again.", null));
  }),

  // ── Addresses ──────────────────────────────────────────────────────────

  listAddresses: asyncHandler(async (req: Request, res: Response) => {
    const addresses = await userService.listAddresses(req.user!.id);
    res.status(HttpStatus.OK).json(successResponse("Addresses fetched successfully", addresses));
  }),

  createAddress: asyncHandler(async (req: Request, res: Response) => {
    const address = await userService.createAddress(req.user!.id, req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Address added successfully", address));
  }),

  updateAddress: asyncHandler(async (req: Request, res: Response) => {
    const address = await userService.updateAddress(req.user!.id, req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Address updated successfully", address));
  }),

  deleteAddress: asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteAddress(req.user!.id, req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Address deleted successfully", null));
  }),

  // ── Admin: user management ─────────────────────────────────────────────

  adminListUsers: asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.adminListUsers(req.query as never);
    res.status(HttpStatus.OK).json(successResponse("Users fetched successfully", result));
  }),

  adminGetUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.adminGetUser(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("User fetched successfully", user));
  }),

  adminUpdateUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.adminUpdateUser(req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("User updated successfully", user));
  }),
};

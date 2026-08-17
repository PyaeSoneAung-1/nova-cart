import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { categoryService, brandService } from "../services/catalogService";
import { successResponse } from "../utils/serialize";
import { HttpStatus } from "../types";

export const categoryController = {
  listPublic: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoryService.listPublic();
    res.status(HttpStatus.OK).json(successResponse("Categories fetched successfully", categories));
  }),

  listAdmin: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoryService.listAdmin();
    res.status(HttpStatus.OK).json(successResponse("Categories fetched successfully", categories));
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.get(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Category fetched successfully", category));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.create(req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Category created successfully", category));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.update(req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Category updated successfully", category));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await categoryService.remove(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Category deleted successfully", null));
  }),
};

export const brandController = {
  listPublic: asyncHandler(async (_req: Request, res: Response) => {
    const brands = await brandService.listPublic();
    res.status(HttpStatus.OK).json(successResponse("Brands fetched successfully", brands));
  }),

  listAdmin: asyncHandler(async (_req: Request, res: Response) => {
    const brands = await brandService.listAdmin();
    res.status(HttpStatus.OK).json(successResponse("Brands fetched successfully", brands));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.create(req.body);
    res
      .status(HttpStatus.CREATED)
      .json(successResponse("Brand created successfully", brand));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandService.update(req.params.id, req.body);
    res.status(HttpStatus.OK).json(successResponse("Brand updated successfully", brand));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await brandService.remove(req.params.id);
    res.status(HttpStatus.OK).json(successResponse("Brand deleted successfully", null));
  }),
};

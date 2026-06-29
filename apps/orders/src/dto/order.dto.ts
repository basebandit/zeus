import { IsUUID, IsNumber, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../entities/order.entity';

export class ShippingAddressDto {
  @ApiProperty({ example: '123 Main St', description: 'Street address' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'San Francisco', description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'CA', description: 'State/Province' })
  @IsString()
  state: string;

  @ApiProperty({ example: '94105', description: 'Postal/ZIP code' })
  @IsString()
  zipCode: string;

  @ApiProperty({ example: 'US', description: 'Country code' })
  @IsString()
  country: string;
}

export class CreateOrderItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product UUID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantity to order', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User UUID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'List of items to order' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto, description: 'Shipping address' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;
}

export class AddToCartDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User UUID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product UUID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1, description: 'Quantity to add', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class RemoveFromCartDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  itemId: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User UUID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 3, description: 'New quantity for the cart line', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class OrderResponseDto {
  id: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentId: string | null;
  shippingAddress: ShippingAddressDto;
  items: OrderItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class OrderItemResponseDto {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

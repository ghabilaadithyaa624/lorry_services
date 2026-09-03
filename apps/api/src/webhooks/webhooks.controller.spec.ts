import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { PaymentsService } from '../payments/payments.service';
import { GupshupService } from '../auth/gupshup.service';
import { CashfreeService } from '../payments/cashfree.service';
import { BadRequestException } from '@nestjs/common';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let cashfreeService: CashfreeService;
  let paymentsService: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: PaymentsService, useValue: { handleWebhook: jest.fn().mockResolvedValue({ success: true }) } },
        { provide: GupshupService, useValue: {} },
        { provide: CashfreeService, useValue: { verifyWebhookSignature: jest.fn() } },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    cashfreeService = module.get<CashfreeService>(CashfreeService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  it('should process cashfree webhook with valid signature', async () => {
    (cashfreeService.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    const result = await controller.handleCashfreeWebhook({ data: 'test' }, 'valid_sig');
    expect(result.success).toBe(true);
    expect(paymentsService.handleWebhook).toHaveBeenCalledWith('cashfree', { data: 'test' });
  });

  it('should reject cashfree webhook with invalid signature', async () => {
    (cashfreeService.verifyWebhookSignature as jest.Mock).mockReturnValue(false);
    await expect(controller.handleCashfreeWebhook({ data: 'test' }, 'invalid_sig'))
      .rejects.toThrow(BadRequestException);
    expect(paymentsService.handleWebhook).not.toHaveBeenCalled();
  });

  it('should reject cashfree webhook with missing signature when verification fails', async () => {
    (cashfreeService.verifyWebhookSignature as jest.Mock).mockReturnValue(false);
    await expect(controller.handleCashfreeWebhook({ data: 'test' }))
      .rejects.toThrow(BadRequestException);
    expect(paymentsService.handleWebhook).not.toHaveBeenCalled();
  });
});

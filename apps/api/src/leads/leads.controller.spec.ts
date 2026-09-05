import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'
import { CreateLeadDto } from './dto/create-lead.dto'

describe('LeadsController', () => {
  let controller: LeadsController
  let service: LeadsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        LeadsService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile()

    controller = module.get(LeadsController)
    service = module.get(LeadsService)
  })

  it('is defined', () => {
    expect(controller).toBeDefined()
  })

  it('delegates submit to LeadsService', () => {
    const spy = jest.spyOn(service, 'submit')
    const dto: CreateLeadDto = {
      name: 'Ravi Kumar',
      companyName: 'Kumar Logistics',
      mobile: '9876543210',
      companyType: 'transporter',
      cityState: 'Chennai, Tamil Nadu',
    }

    const result = controller.submit(dto)

    expect(spy).toHaveBeenCalledWith(dto)
    expect(result.success).toBe(true)
    expect(result.whatsappUrl).toContain('https://wa.me/')
  })
})

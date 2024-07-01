import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/search-similar-products')
  async getSimilarProducts(@Body() body: { encodedImage: string }) {
    const response = await this.appService.getSimilarProducts(body);
    return {
      totalSize: response.length,
      records: response,
    };
  }
}

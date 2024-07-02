import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AppService {
  private GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  private GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
  private GOOGLE_CLOUD_LOCATION_ID = process.env.GOOGLE_CLOUD_LOCATION_ID;

  async getSimilarProducts({ encodedImage }) {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${this.GOOGLE_CLOUD_VISION_API_KEY}`;
    return axios
      .post(url, {
        requests: [
          {
            image: {
              content: encodedImage,
            },
            features: [
              {
                type: 'PRODUCT_SEARCH',
                maxResults: 50,
              },
            ],
            imageContext: {
              productSearchParams: {
                productSet: `projects/${this.GOOGLE_CLOUD_PROJECT_ID}/locations/${this.GOOGLE_CLOUD_LOCATION_ID}/productSets/5b2eb3e30d78ce32`,
                productCategories: ['apparel-v2'],
                filter: '',
              },
            },
          },
        ],
      })
      .then(async (res: any) => {
        const { results } = res.data.responses[0].productSearchResults;
        const response = await Promise.all(
          results.map(async (item) => {
            const [, , , , , productId, , referenceImages] =
              item.image.split('/');
            const uri = await this.getImageUrlFromReferenceImages({
              productId,
              referenceImages,
            });
            return {
              score: item.score,
              name: item.product.displayName,
              description: item.product.description,
              image: uri,
              labels: item.product.productLabels,
            };
          }),
        );
        return response
          .filter((item) => item.score > 0.4)
          .sort((a, b) => b.score - a.score);
      })
      .catch((error) => {
        console.error(error);
        return error;
      });
  }

  private async getImageUrlFromReferenceImages({ productId, referenceImages }) {
    const {
      data: { uri },
    } = await axios.get(
      `https://vision.googleapis.com/v1/projects/${this.GOOGLE_CLOUD_PROJECT_ID}/locations/${this.GOOGLE_CLOUD_LOCATION_ID}/products/${productId}/referenceImages/${referenceImages}?key=${this.GOOGLE_CLOUD_VISION_API_KEY}`,
    );
    return uri.replace('gs://', 'https://storage.googleapis.com/');
  }
}

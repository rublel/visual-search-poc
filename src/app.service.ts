import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AppService {
  async getSimilarProducts({ encodedImage }) {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`;
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
                productSet:
                  'projects/devops-tribe/locations/us-west1/productSets/409fddfc470db26c',
                productCategories: ['apparel-v2'],
                filter: '',
              },
            },
          },
        ],
      })
      .then(async (res: any) => {
        const { results } = res.data.responses[0].productSearchResults;
        console.log({ results });
        const response = await Promise.all(
          results.map(async (item) => {
            const [, projectId, , locationId, , productId, , referenceImages] =
              item.image.split('/');
            console.log({
              projectId,
              locationId,
              productId,
              referenceImages,
            });
            item.image.split('/');
            const {
              data: { uri },
            }: any = await axios.get(
              `https://vision.googleapis.com/v1/projects/${projectId}/locations/${locationId}/products/${productId}/referenceImages/${referenceImages}?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
            );
            return {
              score: item.score,
              name: item.product.displayName,
              description: item.product.description,
              image: uri.replace('gs://', 'https://storage.cloud.google.com/'),
              labels: item.product.productLabels,
            };
          }),
        );
        return response
          .filter((item) => item.score > 0.01)
          .sort((a, b) => b.score - a.score);
      })
      .catch((error) => {
        console.error(error);
        return error;
      });
  }
}

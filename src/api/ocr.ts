import { request } from './request'

export interface OcrImageResponse {
  text: string
}

/**
 * 后端 OCR 识别接口（预留对接）
 * 默认路径：/api/v1/ocr/image
 */
export function ocrImageApi(file: File): Promise<OcrImageResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request<OcrImageResponse>({
    url: '/api/v1/ocr/image',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

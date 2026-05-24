#!/bin/bash
# deploy-cos.sh — 部署到腾讯云 COS 静态网站
set -e

echo "=== 构建生产版本 ==="
npm run build

echo ""
echo "=== 上传到 COS ==="
if ! command -v coscmd &> /dev/null; then
  echo "错误: 未安装 coscmd。请运行: pip install coscmd"
  echo "然后配置: coscmd config -a <SecretId> -s <SecretKey> -b <BucketName> -r <Region>"
  exit 1
fi

coscmd upload -r dist/ /

echo ""
echo "=== 刷新 CDN 缓存 ==="
coscmd purge /

echo ""
echo "=== 部署完成 ==="
echo "访问地址: https://<your-bucket>.cos.<region>.myqcloud.com/"
echo ""
echo "提示: 如果配置了自定义域名，请访问 https://<your-domain>/"

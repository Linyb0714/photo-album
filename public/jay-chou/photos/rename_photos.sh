#!/bin/bash

# 竖图重命名 (纵向图片)
# 333x499 -> jay_portrait_01.jpg
mv "u=1472728171,3893365583&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_01.webp"

# 333x500 -> jay_portrait_02.jpg
mv "u=1762794844,148007084&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_02.webp"

# 445x530 -> jay_portrait_03.jpg
mv "u=3695096711,1136837690&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_03.webp"

# 445x530 -> jay_portrait_04.jpg
mv "u=915319736,3372092542&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_04.webp"

# 500x573 -> jay_portrait_05.jpg
mv "u=1836044176,205267747&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_portrait_05.webp"

# 500x532 -> jay_portrait_06.jpg
mv "u=2869852857,3248046812&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_portrait_06.webp"

# 500x597 -> jay_portrait_07.jpg
mv "u=3098270131,490776726&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_07.webp"

# 500x502 -> jay_portrait_08.jpg
mv "u=3881327915,1270491092&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_08.webp"

# 500x583 -> jay_portrait_09.jpg
mv "u=566984675,2857467393&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_portrait_09.webp"

# 500x750 -> jay_portrait_10.jpg
mv "u=933713788,2404822429&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_portrait_10.webp"

# 500x625 -> jay_portrait_11.jpg
mv "u=999964533,436903435&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_11.webp"

# 500x1084 -> jay_portrait_12.jpg (接近 9:16)
mv "u=2609853058,2559973259&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_12.webp"

# 800x1000 -> jay_portrait_13.jpg (4:5)
mv "u=781396878,407539578&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_portrait_13.webp"

# 800x1185 -> jay_portrait_14.jpg (接近 2:3)
mv "u=4177102703,3918053153&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_portrait_14.webp"

# 横图重命名
# 570x380 -> jay_landscape_01.jpg (3:2)
mv "u=3229389825,2211899750&fm=253&fmt=auto&app=138&f=JPEG.webp" "jay_landscape_01.webp"

# 800x500 -> jay_landscape_02.jpg (8:5)
mv "u=3626795938,878021496&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_landscape_02.webp"

# 方图重命名
# 500x500 -> jay_square_01.jpg
mv "u=4102309310,1000904742&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_square_01.webp"

# 其他横图
# 1067x800 -> jay_landscape_03.jpg (4:3)
mv "u=3437255255,3896732113&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_landscape_03.webp"

# 688x500 -> jay_landscape_04.jpg (约 4:3)
mv "u=857533130,2374716905&fm=253&fmt=auto&app=120&f=JPEG.webp" "jay_landscape_04.webp"

echo "✅ 重命名完成！"
echo ""
echo "统计:"
echo "  竖图 (portrait): 14 张"
echo "  横图 (landscape): 5 张"
echo "  方图 (square): 1 张"
echo ""
ls -1 *.webp

# app.py

import sys
import config
import scanner


def main():
    """
    Hàm chính để chạy ứng dụng quét database.
    """
    if config.GOONG_API_KEY == "YOUR_REST_API_KEY_GOES_HERE":
        print("=" * 60)
        print("LỖI: Bạn chưa cấu hình API Key.")
        print("Vui lòng cập nhật 'GOONG_API_KEY' của bạn.")
        print("=" * 60)
        sys.exit(1)

    print("Bắt đầu quá trình quét và xây dựng database quán ăn TP.HCM...")
    scanner.start_scan()
    print("Hoàn tất.")


if __name__ == "__main__":
    main()

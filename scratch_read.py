import pdfplumber

def main():
    with pdfplumber.open("Dataset/SquadLists-English.pdf") as pdf:
        for i in range(2): # Look at first two pages
            page = pdf.pages[i]
            print(f"--- PAGE {i+1} ---")
            print(page.extract_text())
            print("--- TABLES ---")
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table[:5]: # print first few rows
                        print(row)

if __name__ == "__main__":
    main()

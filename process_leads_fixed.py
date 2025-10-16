import pandas as pd
import numpy as np
from datetime import datetime
import re

def clean_zip_code(zip_str):
    """Clean zip code by extracting only the first 5 digits"""
    if pd.isna(zip_str) or zip_str == '':
        return ''
    # Convert to string and remove extra spaces
    zip_clean = str(zip_str).strip()
    # Extract only the first 5 digits
    zip_match = re.match(r'(\d{5})', zip_clean)
    if zip_match:
        return zip_match.group(1)
    return ''

def process_struxure_leads():
    """Process Struxure leads CSV file"""
    print("Loading Struxure Website Leads CSV...")
    
    # Read the CSV file
    df = pd.read_csv('Struxure Website Leads - Sheet1.csv')
    
    print(f"Original number of leads: {len(df)}")
    
    # Convert timestamp to datetime
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    df['Date'] = df['Timestamp'].dt.date
    
    # Remove duplicates based on email and date - keep only different dates
    print("Removing duplicates (keeping different dates)...")
    
    # Group by email and keep only one record per email per date
    df_deduped = df.drop_duplicates(subset=['Email', 'Date'], keep='first')
    
    print(f"After removing same-day duplicates: {len(df_deduped)}")
    
    # Clean zip codes to only first 5 digits
    df_deduped['Zip_Clean'] = df_deduped['Zip'].apply(clean_zip_code)
    
    return df_deduped

def process_deepwater_zips():
    """Process Deepwater Zips CSV file"""
    print("Loading Deepwater Zips CSV...")
    
    # Read the CSV file
    df_zips = pd.read_csv('Deepwater Zips V2 - V20.csv')
    
    print(f"Number of zip codes in Deepwater file: {len(df_zips)}")
    
    # Clean zip codes to only first 5 digits
    df_zips['zip_clean'] = df_zips['zip'].apply(clean_zip_code)
    
    # Create a mapping dictionary from zip to dealer
    zip_to_dealer = dict(zip(df_zips['zip_clean'], df_zips['Assigned Dealer Account']))
    
    return zip_to_dealer

def update_deepwater_dealers(df, zip_to_dealer):
    """Update Deepwater dealer information based on zip code lookup"""
    print("Updating Deepwater dealer information...")
    
    # Find Deep Water leads
    deepwater_mask = df['Route To'] == 'Deep Water'
    deepwater_leads = df[deepwater_mask]
    
    print(f"Found {len(deepwater_leads)} Deep Water leads")
    
    # Check which ones have empty dealer fields
    empty_dealer_mask = (deepwater_mask) & (df['Deepwater Dealer'].isna() | (df['Deepwater Dealer'] == ''))
    empty_dealer_leads = df[empty_dealer_mask]
    
    print(f"Found {len(empty_dealer_leads)} Deep Water leads with empty dealer fields")
    
    # Update dealer information
    updated_count = 0
    for idx, row in empty_dealer_leads.iterrows():
        zip_code = row['Zip_Clean']
        if zip_code and zip_code in zip_to_dealer:
            df.at[idx, 'Deepwater Dealer'] = zip_to_dealer[zip_code]
            updated_count += 1
            if updated_count <= 10:  # Show first 10 updates
                print(f"Updated {row['First Name']} {row['Last Name']} (ZIP: {zip_code}) -> {zip_to_dealer[zip_code]}")
    
    print(f"Updated {updated_count} Deep Water leads with dealer information")
    
    # Show remaining empty dealer fields (first 20)
    still_empty = df[(deepwater_mask) & (df['Deepwater Dealer'].isna() | (df['Deepwater Dealer'] == ''))]
    if len(still_empty) > 0:
        print(f"\nRemaining {len(still_empty)} Deep Water leads without dealer information (showing first 20):")
        for idx, row in still_empty.head(20).iterrows():
            try:
                print(f"  {row['First Name']} {row['Last Name']} - ZIP: {row['Zip']} (cleaned: {row['Zip_Clean']})")
            except UnicodeEncodeError:
                # Handle special characters by encoding safely
                name = f"{row['First Name']} {row['Last Name']}".encode('ascii', 'replace').decode('ascii')
                print(f"  {name} - ZIP: {row['Zip']} (cleaned: {row['Zip_Clean']})")
    
    return df

def main():
    """Main processing function"""
    print("Starting CSV processing with proper 5-digit zip code matching...")
    
    # Process Struxure leads
    df_leads = process_struxure_leads()
    
    # Process Deepwater zips
    zip_to_dealer = process_deepwater_zips()
    
    # Update Deepwater dealer information
    df_updated = update_deepwater_dealers(df_leads, zip_to_dealer)
    
    # Remove the temporary Zip_Clean column
    df_updated = df_updated.drop('Zip_Clean', axis=1)
    
    # Save the cleaned up CSV
    output_filename = 'Struxure_Leads_Cleaned_Fixed.csv'
    df_updated.to_csv(output_filename, index=False)
    
    print(f"\nCleaned CSV saved as: {output_filename}")
    print(f"Final number of leads: {len(df_updated)}")
    
    # Summary statistics
    print("\nSummary:")
    print(f"Total leads: {len(df_updated)}")
    print(f"Struxure leads: {len(df_updated[df_updated['Route To'] == 'Struxure'])}")
    print(f"Deep Water leads: {len(df_updated[df_updated['Route To'] == 'Deep Water'])}")
    print(f"Deep Water leads with dealer info: {len(df_updated[(df_updated['Route To'] == 'Deep Water') & (df_updated['Deepwater Dealer'].notna()) & (df_updated['Deepwater Dealer'] != '')])}")

if __name__ == "__main__":
    main()

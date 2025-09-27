from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import requests
from bs4 import BeautifulSoup
import re

router = APIRouter()

class PurifyRequest(BaseModel):
    url: str
    remove_ads: bool = True
    remove_trackers: bool = True
    remove_popups: bool = True

class PurifyResponse(BaseModel):
    original_url: str
    cleaned_content: str
    removed_elements: List[str]
    success: bool
    message: str

class AnalyzeRequest(BaseModel):
    html_content: str

class AnalyzeResponse(BaseModel):
    ads_detected: int
    trackers_detected: int
    suspicious_scripts: int
    recommendations: List[str]

@router.post("/purify", response_model=PurifyResponse)
async def purify_website(request: PurifyRequest):
    """
    Purify a website by removing ads, trackers, and other unwanted content
    """
    try:
        # Fetch the website content
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(request.url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML content
        soup = BeautifulSoup(response.text, 'html.parser')
        removed_elements = []
        
        if request.remove_ads:
            # Remove common ad elements
            ad_selectors = [
                '[class*="ad"]', '[id*="ad"]', '.advertisement', '.ads',
                '[class*="banner"]', '.sponsored', '.promo'
            ]
            for selector in ad_selectors:
                elements = soup.select(selector)
                for element in elements:
                    element.decompose()
                    removed_elements.append(f"Ad element: {selector}")
        
        if request.remove_trackers:
            # Remove tracking scripts
            scripts = soup.find_all('script')
            for script in scripts:
                if script.get('src'):
                    src = script.get('src')
                    if any(tracker in src for tracker in ['google-analytics', 'googletagmanager', 'facebook', 'tracker']):
                        script.decompose()
                        removed_elements.append(f"Tracking script: {src}")
        
        if request.remove_popups:
            # Remove popup elements
            popup_selectors = [
                '.modal', '.popup', '.overlay', '[class*="popup"]'
            ]
            for selector in popup_selectors:
                elements = soup.select(selector)
                for element in elements:
                    element.decompose()
                    removed_elements.append(f"Popup element: {selector}")
        
        cleaned_html = str(soup)
        
        return PurifyResponse(
            original_url=request.url,
            cleaned_content=cleaned_html,
            removed_elements=removed_elements,
            success=True,
            message="Website successfully purified"
        )
    
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch website: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error purifying website: {str(e)}")

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    """
    Analyze HTML content for ads, trackers, and suspicious scripts
    """
    try:
        soup = BeautifulSoup(request.html_content, 'html.parser')
        
        # Count ads
        ad_elements = soup.select('[class*="ad"], [id*="ad"], .advertisement, .ads, [class*="banner"], .sponsored')
        ads_detected = len(ad_elements)
        
        # Count trackers
        scripts = soup.find_all('script')
        trackers_detected = 0
        for script in scripts:
            if script.get('src'):
                src = script.get('src')
                if any(tracker in src for tracker in ['google-analytics', 'googletagmanager', 'facebook', 'tracker']):
                    trackers_detected += 1
        
        # Count suspicious scripts
        suspicious_scripts = 0
        for script in scripts:
            if script.string:
                # Look for obfuscated code patterns
                if re.search(r'eval\(|document\.write\(|unescape\(', script.string):
                    suspicious_scripts += 1
        
        # Generate recommendations
        recommendations = []
        if ads_detected > 0:
            recommendations.append(f"Found {ads_detected} ad elements that can be removed")
        if trackers_detected > 0:
            recommendations.append(f"Found {trackers_detected} tracking scripts that can be blocked")
        if suspicious_scripts > 0:
            recommendations.append(f"Found {suspicious_scripts} potentially suspicious scripts")
        if not recommendations:
            recommendations.append("Content appears clean")
        
        return AnalyzeResponse(
            ads_detected=ads_detected,
            trackers_detected=trackers_detected,
            suspicious_scripts=suspicious_scripts,
            recommendations=recommendations
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing content: {str(e)}")

@router.get("/status")
async def get_purifier_status():
    """
    Get the status of the purifier service
    """
    return {
        "service": "WebPurifier",
        "status": "active",
        "features": ["ad_removal", "tracker_blocking", "popup_removal", "content_analysis"]
    }
UPDATE settings
SET value = '["GB1","GB 1/2","GB2","No Gi","Kids 3 - 6 yo","Kids 6 - 8 yo","Kids 7 - 9 yo","Kids All Ages","Kids & Parents","Juniors & Teens","Women''s","MUAY THAI","Wrestling","Judo","Jiu-Jitsu Drills"]'::jsonb
WHERE key = 'class_types';
